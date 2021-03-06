describe('executions.wizard.controller.executions-controller', function() {
  beforeEach(module('webApp'));
  beforeEach(module('api/policyList.json'));
  beforeEach(module('api/policiesStatusList.json'));

  var ctrl, scope, $interval, $timeout, fakePolicyList, fakePolicyStatusList, fakeError, policyModelFactoryMock, policyFactoryMock,
      stateMock, fakeCreationStatus, modalServiceMock, resolvedPromise, rejectedPromise, fakeFinalPolicyJSON, wizardStatusServiceMock;

  // init mock modules

  beforeEach(inject(function($controller, $q, $httpBackend, $rootScope, _apiPolicyList_, _apiPoliciesStatusList_, _$interval_, _$timeout_) {
    scope = $rootScope.$new();
    $interval = _$interval_;
    $timeout = _$timeout_;
    fakePolicyList = _apiPolicyList_;
    fakePolicyStatusList = _apiPoliciesStatusList_;
    resolvedPromise = function() {
      var defer = $q.defer();
      defer.resolve();

      return defer.promise;
    };

    fakeError = {"data": {"i18nCode": "fake error message"}};
    rejectedPromise = function() {
      var defer = $q.defer();
      defer.reject(fakeError);

      return defer.promise;
    };

    $httpBackend.when('GET', 'languages/en-US.json')
        .respond({});
    fakeCreationStatus = {"currentStep": 0};
    policyFactoryMock = jasmine.createSpyObj('PolicyFactory', ['getAllPolicies', 'getPoliciesStatus', 'runPolicy', 'stopPolicy', 'deletePolicyCheckpoint']);
    policyFactoryMock.getAllPolicies.and.callFake(function() {
      var defer = $q.defer();
      defer.resolve(fakePolicyList);
      return defer.promise;
    });

    policyFactoryMock.getPoliciesStatus.and.callFake(function() {
      var defer = $q.defer();
      defer.resolve(fakePolicyStatusList);
      return defer.promise;
    });
    stateMock = jasmine.createSpyObj('$state', ['go']);

    wizardStatusServiceMock = jasmine.createSpyObj('wizardStatusService', ['getStatus']);
    wizardStatusServiceMock.getStatus.and.returnValue(fakeCreationStatus);
    policyModelFactoryMock = jasmine.createSpyObj('PolicyModelFactory', ['setError',
      'getError', 'getProcessStatus', 'resetPolicy']);

    fakeFinalPolicyJSON = {"fake_attribute": "fake value"};

    modalServiceMock = jasmine.createSpyObj('ModalService', ['openModal']);

    modalServiceMock.openModal.and.callFake(function() {
      var defer = $q.defer();
      defer.resolve();
      return {"result": defer.promise};
    });

    ctrl = $controller('ExecutionsListCtrl', {
      'WizardStatusService': wizardStatusServiceMock,
      'PolicyModelFactory': policyModelFactoryMock,
      'PolicyFactory': policyFactoryMock,
      'ModalService': modalServiceMock,
      '$state': stateMock,
      '$scope': scope
    });

    scope.$digest();

  }));

  describe("when it is initialized", function() {
    describe("Should request the current policy list and their status", function() {
      beforeEach(function() {
        policyFactoryMock.getPoliciesStatus.calls.reset();
      });


      describe("each 5 seconds, it should update the status of policies", function() {
        it("if server connection is lost, it should abort the updating of policy status", function() {
          policyFactoryMock.getPoliciesStatus.calls.reset();
          policyFactoryMock.getPoliciesStatus.and.callFake(rejectedPromise);
          $interval.flush(25000);
          expect(policyFactoryMock.getPoliciesStatus.calls.count()).toEqual(1);
        });

        describe("while server connection is right, it should update the policy status data", function() {
          it('If policy was already painted, its status data is updated', function() {
            var fakeNewStatus = {
              status: 'stopped',
              statusInfo: 'Status info data',
              submissionId: 'fake submission id'
            };
            fakePolicyStatusList[0].status = fakeNewStatus.status;
            fakePolicyStatusList[0].statusInfo = fakeNewStatus.statusInfo;
            fakePolicyStatusList[0].submissionId = fakeNewStatus.submissionId;

            $interval.flush(5000);
            expect(policyFactoryMock.getPoliciesStatus.calls.count()).toEqual(1);
            $interval.flush(15000);
            expect(policyFactoryMock.getPoliciesStatus.calls.count()).toEqual(4);
            $interval.flush(5000);
            scope.$digest();

            expect(ctrl.policiesData[0].status).toEqual(fakeNewStatus.status);
            expect(ctrl.policiesData[0].statusInfo).toEqual(fakeNewStatus.statusInfo);
            expect(ctrl.policiesData[0].submissionId).toEqual(fakeNewStatus.submissionId);
          });

          it('if policy was not painted yet, it is added to policy list', function() {
            var oldPolicyListLength = fakePolicyStatusList.length;
            var newPolicy = angular.copy(fakePolicyStatusList[0]);
            newPolicy.id = 'new policy id';

            fakePolicyStatusList.push(newPolicy);
            $interval.flush(15000);
            scope.$digest();

            expect(ctrl.policiesData.length).toEqual(oldPolicyListLength + 1);
          });
        });
      });
    })
  });


  it("should be able to open a modal with the information of the selected policy by its position", function() {
    ctrl.policiesData = [fakePolicyStatusList[0], fakePolicyStatusList[1]];
    for (var i = 0; i < ctrl.policiesData.length; ++i) {
      ctrl.showInfoModal(ctrl.policiesData[i]);

      expect(modalServiceMock.openModal).toHaveBeenCalled();
      var args = modalServiceMock.openModal.calls.mostRecent().args;
      expect(args[0]).toBe('PolicyInfoModalCtrl');
      expect(args[1]).toBe('templates/modal/policy-info-modal.tpl.html');
      var resolveParam = args[2];
      expect(resolveParam.policyName()).toBe(ctrl.policiesData[i].name);
      expect(resolveParam.policyDescription()).toBe(ctrl.policiesData[i].description);
      expect(resolveParam.status()).toBe(ctrl.policiesData[i].status);
      expect(resolveParam.statusInfo()).toBe(ctrl.policiesData[i].statusInfo);
      expect(resolveParam.submissionId()).toBe(ctrl.policiesData[i].submissionId);
      expect(resolveParam.deployMode()).toBe(ctrl.policiesData[i].lastExecutionMode);
      expect(resolveParam.error()).toEqual(ctrl.policiesData[i].lastError);
    }
  });


  it("should be able to stop a policy if is started", function() {
    var fakePolicyId = "fake policy id";
    var fakePolicyStatus = "started";
    var fakePolicyName = "fakePolicyName";
    
    var stopPolicy = {
      "id": fakePolicyId,
      "status": "Stopping"
    };

    policyFactoryMock.stopPolicy.and.callFake(resolvedPromise);
    ctrl.stopPolicy(fakePolicyId, fakePolicyStatus, fakePolicyName);

    expect(policyFactoryMock.stopPolicy).toHaveBeenCalledWith(stopPolicy);
  });


  it("should not be able to stop a policy if is not started", function() {
    var fakePolicyId = "fake policy id";
    var fakePolicyStatus = "notstarted";
    var fakePolicyName = "fakePolicyName";

    policyFactoryMock.stopPolicy.and.callFake(resolvedPromise);
    ctrl.stopPolicy(fakePolicyId, fakePolicyStatus, fakePolicyName);

    expect(policyFactoryMock.stopPolicy).not.toHaveBeenCalled();
  });


  it("should be able to run a policy if is not started", function() {
    var fakePolicyId = "fake policy id";
    var fakePolicyStatus = "notstarted";
    var fakePolicyName = "fakePolicyName";

    policyFactoryMock.runPolicy.and.callFake(resolvedPromise);
    ctrl.runPolicy(fakePolicyId, fakePolicyStatus, fakePolicyName);

    expect(policyFactoryMock.runPolicy).toHaveBeenCalledWith(fakePolicyId);
  });


  it("should not be able to run a policy if is started", function() {
    var fakePolicyId = "fake policy id";
    var fakePolicyStatus = "started";
    var fakePolicyName = "fakePolicyName";

    policyFactoryMock.runPolicy.and.callFake(resolvedPromise);
    ctrl.runPolicy(fakePolicyId, fakePolicyStatus, fakePolicyName);

    expect(policyFactoryMock.runPolicy).not.toHaveBeenCalled();
  });


  it("should be able to delete policy checkpoint passing its name", function() {
    var fakePolicyName = "fakePolicyName";
    policyFactoryMock.deletePolicyCheckpoint.and.callFake(resolvedPromise);
    ctrl.deleteCheckpoint(fakePolicyName);

    expect(policyFactoryMock.deletePolicyCheckpoint).toHaveBeenCalledWith(fakePolicyName);
  });


  describe("should be able to sort the current policy list", function(){

    beforeEach(function() {
      ctrl.tableReverse = false;
      ctrl.sortField = "name";
    });

    it("new sort field is different from the current one, it is sorted by that field", function() {
      var oldSortField = ctrl.sortField;
      ctrl.sortPolicies("description");
      expect(ctrl.sortField).not.toEqual(oldSortField);
      expect(ctrl.tableReverse).toBe(false);
    });

    it("new sort field is the same from the current one, change current reverse order", function() {
      var oldSortField = ctrl.sortField;
      ctrl.sortPolicies("name");
      expect(ctrl.sortField).toEqual(oldSortField);
      expect(ctrl.tableReverse).toBe(true);
    });
  });
});
